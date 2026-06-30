# -*- coding: utf-8 -*-
"""
Created on Mon Jun 20 17:04:21 2022

@author: liansiqi
"""

import numpy as np
import pandas as pd
import os
import re
from itertools import compress
from datetime import datetime, time, date, timedelta
import datetime
import time

keyword = '审核工作日志'
dd = -1
yesterday = (datetime.date.today() + datetime.timedelta(days=dd)).strftime('%Y%m%d')
now = datetime.datetime.now()
#yday = datetime.datetime(now.year, now.month, now.day-1).date()
#date转为datetime
yday=(datetime.date.today() + datetime.timedelta(days=dd))
yday = pd.to_datetime(yday,format = '%Y/%m/%d')

#标准化分工表
def readFengong(fenGong):
    #格式化处理
    fenGong = fenGong.drop(["分工"],axis=1)
    
    #fenGong = fenGong.set_index("班次")
    fenGong = fenGong.dropna(how="all")
    
    #日期转换
    fenGong = fenGong[['班次',yday]]
    fenGong = fenGong.reset_index(drop=True)
    #fenGong.index = fenGong['班次']
    #fenGong = fenGong.drop(['班次'],axis=1)
  
    #班次填充
    cIndex=[]
    for c,d in zip(fenGong['班次'],range(len(fenGong['班次']))):
        if c is np.nan:
            #print(fenGong.loc[d-1,'班次'])
            fenGong.loc[d,'班次'] = fenGong.loc[d-1,'班次']
        else:
           fenGong.loc[d,'班次'] = fenGong.loc[d,'班次']


    #转置
    fenGong.index = fenGong['班次']
    fenGong = fenGong.drop(['班次'],axis=1)
    #print(fenGong)
    fenGong = fenGong.T
    return fenGong

                
#分工表转换为分工明细表
def fenGong2Detail(fg):
    listTime = []
    listTurn = []
    listName = []
    #print(fg)
    for a in range(fg.shape[0]):
        for b in range(fg.shape[1]):
            for c in range(len(fg.iloc[a,b].split(' '))):
                #print(a,b,c)
                listName.append(fg.iloc[a,b].split(' ')[c])
                #tempTime = str(fg.index[a])
                #print(type(fg.index[a]))
                tempTime = datetime.datetime.strptime(str(fg.index[a]), "%Y-%m-%d %H:%M:%S").strftime('%Y/%m/%d')
                #tempTime = fg.index[a]
                listTime.append(tempTime)  
                listTurn.append(fg.columns[b])
                
    dfTime = pd.DataFrame(listTime,columns = ['日期'])
    dfTurn = pd.DataFrame(listTurn,columns = ['班次'])
    dfName = pd.DataFrame(listName,columns = ['编辑'])
    fenGongDetail = pd.concat([dfTime,dfTurn,dfName],axis = 1)
    #print(fenGongDetail)
    return fenGongDetail

## 读取文件
audit_detail = pd.DataFrame()
files_and_dirs = os.listdir()
xlsx_flag = [re.search(keyword, x) is not None for x in files_and_dirs]
xlsxfiles = list(compress(files_and_dirs, xlsx_flag))
audit_detail = pd.read_excel(xlsxfiles[0])
publish_num = pd.read_excel("要闻组编辑每日发稿数.xlsx")
retuiGroup = pd.read_excel("分工-热推.xlsx")
yemianGroup = pd.read_excel("分工-页面.xlsx")
zengzhangGroup = pd.read_excel("分工-增长.xlsx",sheet_name="分工",index_col=0)
#localGroup = pd.read_excel("分工-本地104.xlsx")

#标准化分工表
retuiStardard = readFengong(retuiGroup)
#分工表转换为明细表，对应：日期、班次、编辑
fenGongDetail = fenGong2Detail(retuiStardard)

#获取页面组明细表
yemianGroup = (yemianGroup.unstack().apply(lambda x: pd.Series(str(x).split(' '))).stack().reset_index().drop('level_2',axis =1))
yemianGroup.columns=['day','班次','编辑']
yemianGroup = yemianGroup.dropna()
yemianGroup = yemianGroup[~yemianGroup['编辑'].isin(['nan'])]#删除包含nan特殊字符的行
yemianGroup = yemianGroup[yemianGroup['day']==yday]
yemianGroup = yemianGroup[['day','编辑']].reset_index(drop=True)
#yemianGroup = yemianGroup.reset_index(drop=True)

'''
#获取本地104明细表
localGroup = (localGroup.unstack().apply(lambda x: pd.Series(str(x).split(' '))).stack().reset_index().drop('level_2',axis =1))
localGroup.columns=['day','班次','编辑']
localGroup = localGroup.dropna()
localGroup = localGroup[~localGroup['编辑'].isin(['nan'])]#删除包含nan特殊字符的行
localGroup = localGroup[localGroup['day']==yday]
localGroup = localGroup[['day','编辑']].reset_index(drop=True)
'''
#2022.9.1修改本地104更新为排班表
localGroup1 = pd.read_excel("分工-104本地.xlsx",index_col=0)
localGroup1.columns = localGroup1.columns.map(lambda x:x.strftime('%Y%m%d'))
localGroup1 = localGroup1[[yesterday]]
localGroup1_idx = None
for i in range(localGroup1.shape[0]):
    if (localGroup1.iloc[i,0] == '年' or localGroup1.iloc[i,0] == '休' or localGroup1.iloc[i,0] == '假'):
        localGroup1_idx=localGroup1[(localGroup1[yesterday]== '年')|(localGroup1[yesterday]== '休')|(localGroup1[yesterday]== '假')].index 
if localGroup1_idx is None:
    print("nonelocalrest")
else:
    localGroup1=localGroup1.drop(localGroup1_idx)   
    
localGroup1.columns = ['day']
localGroup1['day'] = yday
localGroup1.reset_index(inplace = True)
#获取增长组明细表
#report_day = (datetime.date.today() + datetime.timedelta(days=dd)).strftime('%Y-%m-%d')
#daterange = zengzhangGroup.iloc[0,:].apply(lambda x: x.strftime('%Y-%m-%d'))
daterange = zengzhangGroup.iloc[0,:]
zengzhangGroupDay = daterange[daterange  == yday].index
zengzhangGroupDetail = zengzhangGroup.loc[:,zengzhangGroupDay]
zengzhangGroupDetail.columns = ['编辑']
zengzhangGroupDetail['day']=yday
zengzhangGroupDetail = zengzhangGroupDetail.dropna()
zengzhangGroupDetail = zengzhangGroupDetail[~zengzhangGroupDetail['编辑'].isin([yday])]
zengzhangGroup = zengzhangGroupDetail[['day','编辑']].reset_index(drop=True)

#合并增长组和页面组的编辑，并且去重
editorGroup = pd.concat([zengzhangGroup,yemianGroup,localGroup1],axis=0).drop_duplicates()

#审核计算
audit_result = pd.DataFrame(audit_detail.groupby('编辑')['违规行为'].count())
audit_result['编辑'] = audit_result.index
audit_result['错误稿件数'] = audit_result['违规行为']
audit_result = audit_result.reset_index(drop=True)
audit_result = audit_result[['编辑','错误稿件数']]
result = audit_result.merge(publish_num,on="编辑",how = 'outer')

result = result[['编辑','错误稿件数','发布稿件数']]

retui = pd.merge(left = fenGongDetail,right = result,on="编辑",how = 'left')
retuiall = pd.DataFrame(retui.groupby('班次')[['错误稿件数','发布稿件数']].sum())
retuiall = retuiall.merge(fenGongDetail,on='班次',how='left')
retuiall = retuiall[['编辑','错误稿件数','发布稿件数']]
retuiall = retuiall.query('发布稿件数>0')

#删除非当天排班的编辑
editorDetail = result.merge(editorGroup,on="编辑",how='outer')
editorDetail = editorDetail.dropna(subset=['day'])
editorDetail = editorDetail[['编辑','错误稿件数','发布稿件数']]


#与热推组的编辑数据合并
result = pd.concat([editorDetail,retuiall],axis=0)
result = result.sort_values(by='发布稿件数',ascending=False)
result = result.drop_duplicates(subset='编辑', keep="first")
result['错误稿件数'] = result['错误稿件数'].replace(np.nan,0)
result = result.drop(index=result[(result.编辑=='robot-news')].index.tolist())


result['错误占比'] = result['错误稿件数'] / result['发布稿件数']
result = result.sort_values(by=['错误占比'],ascending=False)

result['错误占比'] = result['错误占比'].apply(lambda x:format(x,'.2%'))
result['发布稿件数'] = result['发布稿件数'].replace(np.nan,"无发稿数据，请核实排班")
result['错误占比'] = result['错误占比'].replace("nan%","无法计算")

#result = result.dropna(subset=['错误稿件数'],inplace=True)
#result = result[~result['错误稿件数'].isin([np.nan])]


#PC值班的编辑单独处理
pcEditor = audit_result.query("编辑 == '张叶芳' or 编辑== '汪丽'")
result = result.query("编辑 != 'a'")
result = pd.concat([result,pcEditor],axis=0)
result['发布稿件数'] = result['发布稿件数'].replace(np.nan,"PC数据无法获取")
result['错误占比'] = result['错误占比'].replace(np.nan," ")

result = result.rename(columns={'发布稿件数':'发布稿件数(根据内容id去重，结果会小于去重前条数)'})
result = result.reset_index(drop=True)

writer=pd.ExcelWriter(str(yesterday)+"-审核工作日志.xlsx")
audit_detail.to_excel(excel_writer=writer,index = 0)
result.to_excel(excel_writer=writer,startrow = audit_detail.shape[0] + 3,index = 0)
#writer.save()
writer.close()
print("文件1已成功导出！")
writer1=pd.ExcelWriter(str(yesterday)+"-审核工作日志-缓存版.xlsx")
audit_detail.to_excel(excel_writer=writer1,index = 0)
result.to_excel(excel_writer=writer1,index = 0,sheet_name="result")
#writer1.save()
writer1.close()
print("文件2已成功导出！")


